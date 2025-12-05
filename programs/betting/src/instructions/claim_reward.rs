use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{error::ErrorCode, BetAccount, EventAccount, OptionAccount};

#[derive(Accounts)]
#[instruction(_event_id: u64)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    /// CHECK: There is no data. Konto do trzymania waluty.
    #[account(
        mut,
        seeds = [b"vault".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"bet".as_ref(), player.key().as_ref(), _event_id.to_le_bytes().as_ref()],
        bump,
        constraint = bet_account.player == player.key()
    )]
    pub bet_account: Account<'info, BetAccount>,

    #[account(
        mut,
        seeds = [b"event_seed".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump,
        constraint = event_account.event_resolved
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        seeds = [b"option_seed".as_ref(), _event_id.to_le_bytes().as_ref(), bet_account.option.as_ref()],
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
    let option = &mut &ctx.accounts.option_account;
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
    let payout = (bet.amount as u128)
        .checked_mul(total_pool as u128)
        .unwrap()
        / (total_winner_pool as u128);

    // let transfer_context = CpiContext::new(
    //     system_program.to_account_info(),
    //     Transfer {
    //         from: vault.to_account_info(),
    //         to: player.to_account_info(),
    //     },
    // );

    // transfer(transfer_context, payout as u64)?;

    let bump = ctx.bumps.vault_account;

    let event_id_bytes = _event_id.to_le_bytes();
    let vault_seeds = &[
        b"vault".as_ref(),
        event_id_bytes.as_ref(),
        &[bump],
    ];
    let signer_seeds = &[&vault_seeds[..]];

    let transfer_context = CpiContext::new_with_signer(
        system_program.to_account_info(),
        Transfer {
            from: vault.to_account_info(),
            to: player.to_account_info(),
        },
        signer_seeds,
    );
    transfer(transfer_context, payout as u64)?;
    bet.reward_claimed = true;

    // msg!("Nazwa drużyny: {}", option.option_name);
    // msg!("Ilość oddanych zakładów: {}", option.option_votes);
    // msg!(
    //     "Łączna wartość zakładów na daną drużynę: {}",
    //     option.option_pool
    // );
    // msg!("Nazwa wydarzenia: {}", event.event_name);
    // msg!("Opis wydarzenia: {}", event.event_description);
    // msg!(
    //     "Termin rozpoczęcia przyjmowania zakładów: {}",
    //     event.betting_start
    // );
    // msg!(
    //     "Termin zakończenia przyjmowania zakładów: {}",
    //     event.betting_start
    // );
    // msg!(
    //     "Aktualna liczba drużyn birących udział w wydarzeniu: {}",
    //     event.betting_options_index
    // );
    // msg!(
    //     "Czy wydarzenie zostało zakończone?: {}",
    //     event.event_resolved
    // );
    // msg!(
    //     "Nazwa zwycięskiej drużyny: {}",
    //     event.winning_option
    // );
    // msg!("Całkowita pula: {}", event.total_pool);
    // msg!("Osoba obstawiająca: {}", bet.player);
    // msg!("ID wydarzenia: {}", bet.event_id);
    // msg!("Nazwa drużyny: {}", bet.option);
    // msg!("Obstawiona kwota: {}", bet.amount);
    // msg!("Czy nagroda została odebrana: {}", bet.reward_claimed);

    Ok(())
}
