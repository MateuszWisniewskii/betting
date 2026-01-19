use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;

use crate::{BET_SEED, BetAccount, EVENT_SEED, EventAccount, OPTION_SEED, OptionAccount, VAULT_SEED, error::ErrorCode};

#[derive(Accounts)]
#[instruction(_event_id: u64)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    /// CHECK: Konto admina/autoryzacji, które otrzyma resztę.
    /// Nie musi być Signerem. Używamy has_one dla weryfikacji.
    #[account(
        mut,
        constraint = authority.key() == event_account.authority
    )]
    pub authority: AccountInfo<'info>,

    /// CHECK: There is no data. Konto do trzymania waluty.
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [BET_SEED.as_bytes(), player.key().as_ref(), _event_id.to_le_bytes().as_ref()],
        bump,
        constraint = bet_account.player == player.key()
    )]
    pub bet_account: Account<'info, BetAccount>,

    #[account(
        mut,
        seeds = [EVENT_SEED.as_bytes(), _event_id.to_le_bytes().as_ref()],
        bump,
        constraint = event_account.event_resolved
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        seeds = [OPTION_SEED.as_bytes(), _event_id.to_le_bytes().as_ref(), bet_account.option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimReward>, _event_id: u64) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let bet = &mut ctx.accounts.bet_account;
    let vault = &mut ctx.accounts.vault_account;
    let event = &mut ctx.accounts.event_account;
    let option = &mut ctx.accounts.option_account;
    let system_program = &ctx.accounts.system_program;
    let current_time = Clock::get()?.unix_timestamp;

    if current_time < (event.betting_start as i64) {
        return Err(ErrorCode::BettingNotStarted.into());
    }

    if current_time < (event.betting_end as i64) {
        return Err(ErrorCode::EventDoesNotEnded.into());
    }

    if event.event_resolved == false {
        return Err(ErrorCode::EventIsNotResolved.into());
    }

    if bet.reward_claimed == true {
        return Err(ErrorCode::RewardAlreadyClaimed.into());
    }

    if bet.option != event.winning_option {
        bet.reward_claimed = true;
        msg!("Niestety, twoja drużyna nie wygrała, nie należy ci się nagroda");
        return Ok(());
    }

    // payout = (user_bet_amount / total_bets_on_winner) * total_vault_balance
    //
    // skoro zwycięzcy dostają całą pule to każdy zwycięzca dostaje proporcjonalny kawałek
    // przykład: pula A = 50, pula B (wygrana) = 100, całkowita pula = 150
    // jeżeli użytkownik postawił 10 na zwycięską pulę to jego udział w zwycięskiej puli równy jest 10/100 = 0,1
    // więc nagroda dla niego wynosi 0,1 * 150 = 15
    // gdyby był tylko jeszcze jeden gracz, który obstawił 90 na wygraną opcję, jego udział w tej puli wynosi 90/100 = 0,9
    // stąd jego nagroda wynosi 0,9 * 150 = 135
    // po dodaniu dwóch wygranych 135 + 15 = 150, widać że cała pula została proporcjonalnie podzielona między graczy, którzy obstawili zwycięską drużynę

    let total_winner_pool = option.option_pool;
    let total_pool = event.total_pool;
    let mut payout = (bet.amount)
        .checked_mul(total_pool)
        .unwrap()
        .checked_div(total_winner_pool)
        .unwrap() as u64;

    let bump = ctx.bumps.vault_account;

    let event_id_bytes = _event_id.to_le_bytes();
    let vault_seeds = &[b"vault".as_ref(), event_id_bytes.as_ref(), &[bump]];
    let signer_seeds = &[&vault_seeds[..]];

    let transfer_context = CpiContext::new_with_signer(
        system_program.to_account_info(),
        Transfer {
            from: vault.to_account_info(),
            to: player.to_account_info(),
        },
        signer_seeds,
    );


    msg!("Stan skarbca: {}", vault.to_account_info().lamports());
    transfer(transfer_context, payout as u64)?;
    bet.reward_claimed = true;

    option.option_votes = option.option_votes.checked_sub(1).ok_or(ErrorCode::Overflow)?;

    if  option.option_votes == 0 {
        msg!("Ostatni odbiór! Zamykanie skarbca i transfer pozostałego salda: {} lamportów.", vault.to_account_info().lamports());

        let vault_info = vault.to_account_info();
        let authority_info = ctx.accounts.authority.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();

        // Stwórz instrukcję do transferu CAŁEGO pozostałego salda (w tym Rent Exempt)
        let ix = system_instruction::transfer(
            vault_info.key,
            authority_info.key,
            vault.to_account_info().lamports(),
        );

        // Wywołaj transfer z użyciem system_program, jako podpisany przez PDA
        invoke_signed(
            &ix,
            &[
                vault_info.clone(),
                authority_info.clone(),
                system_program_info.clone(),
            ],
            signer_seeds,
        )?;
    }
    

    msg!("Nazwa drużyny: {}", option.option_name);
    msg!("Ilość oddanych zakładów: {}", option.option_votes);
    msg!(
        "Łączna wartość zakładów na daną drużynę: {}",
        option.option_pool
    );
    msg!("Nazwa wydarzenia: {}", event.event_name);
    msg!("Opis wydarzenia: {}", event.event_description);
    msg!(
        "Termin rozpoczęcia przyjmowania zakładów: {}",
        event.betting_start
    );
    msg!(
        "Termin zakończenia przyjmowania zakładów: {}",
        event.betting_start
    );
    msg!(
        "Aktualna liczba drużyn birących udział w wydarzeniu: {}",
        event.betting_options_index
    );
    msg!(
        "Czy wydarzenie zostało zakończone?: {}",
        event.event_resolved
    );
    msg!("Nazwa zwycięskiej drużyny: {}", event.winning_option);
    msg!("Całkowita pula: {}", event.total_pool);
    msg!("Osoba obstawiająca: {}", bet.player);
    msg!("ID wydarzenia: {}", bet.event_id);
    msg!("Nazwa drużyny: {}", bet.option);
    msg!("Obstawiona kwota: {}", bet.amount);
    msg!("Czy nagroda została odebrana: {}", bet.reward_claimed);
    msg!("Wygrana: {}", payout);
    msg!("Stan skarbca: {}", vault.to_account_info().lamports());

    Ok(())
}
