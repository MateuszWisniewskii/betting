use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::{BetAccount, EventAccount, OptionAccount, ANCHOR_DISCRIMINATOR_SIZE};

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64, option: String)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"event_seed".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        seeds = [b"option_seed".as_ref(), _event_id.to_le_bytes().as_ref(), option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    /// CHECK: There is no data. Konto do trzymania waluty.
    #[account(
        mut,
        seeds = [b"vault".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = player,
        space = ANCHOR_DISCRIMINATOR_SIZE + BetAccount::INIT_SPACE,
        seeds = [b"bet".as_ref(), player.key().as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bet_account: Account<'info, BetAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBet>, _event_id: u64, option: String, amount: u64) -> Result<()> {
    let option_account = &mut ctx.accounts.option_account;
    let system_program = &mut ctx.accounts.system_program;
    let vault = &mut ctx.accounts.vault_account;
    let player = &mut ctx.accounts.player;
    let bet = &mut ctx.accounts.bet_account;
    let event_account = &mut ctx.accounts.event_account;

    let current_time = Clock::get()?.unix_timestamp;

    if bet.bet_placed {
        return Err(ErrorCode::BetAlreadyPlaced.into());
    }

    if current_time > (event_account.betting_end as i64) {
        return Err(ErrorCode::BettingEnded.into());
    }

    if current_time <= (event_account.betting_start as i64) {
        return Err(ErrorCode::BettingNotStarted.into());
    }

    if amount <= 0 {
    return Err(ErrorCode::InvalidBetAmount.into()); 
}

    let transfer_context = CpiContext::new(
        system_program.to_account_info(),
        Transfer {
            from: player.to_account_info(),
            to: vault.to_account_info(),
        },
    );

    transfer(transfer_context, amount)?;

    bet.player = player.key();
    bet.event_id = _event_id;
    bet.option = option;
    bet.amount = amount;
    bet.reward_claimed = false;
    bet.bet_placed = true;

    option_account.option_votes = option_account.option_votes.checked_add(1).ok_or(ErrorCode::Overflow)?;
    option_account.option_pool = option_account.option_pool.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    event_account.total_pool = event_account.total_pool.checked_add(amount).ok_or(ErrorCode::Overflow)?;

    msg!("Nazwa drużyny: {}", option_account.option_name);
    msg!("Ilość oddanych zakładów: {}", option_account.option_votes);
    msg!(
        "Łączna wartość zakładów na daną drużynę: {}",
        option_account.option_pool
    );
    msg!("Nazwa wydarzenia: {}", event_account.event_name);
    msg!("Opis wydarzenia: {}", event_account.event_description);
    msg!(
        "Termin rozpoczęcia przyjmowania zakładów: {}",
        event_account.betting_start
    );
    msg!(
        "Termin zakończenia przyjmowania zakładów: {}",
        event_account.betting_end
    );
    msg!(
        "Aktualna liczba drużyn birących udział w wydarzeniu: {}",
        event_account.betting_options_index
    );
    msg!(
        "Czy wydarzenie zostało zakończone?: {}",
        event_account.event_resolved
    );
    msg!(
        "Nazwa zwycięskiej drużyny: {}",
        event_account.winning_option
    );
    msg!("Całkowita pula: {}", event_account.total_pool);
    msg!("Osoba obstawiająca: {}", bet.player);
    msg!("ID wydarzenia: {}", bet.event_id);
    msg!("Nazwa drużyny: {}", bet.option);
    msg!("Obstawiona kwota: {}", bet.amount);
    msg!("Czy nagroda została odebrana: {}", bet.reward_claimed);

    Ok(())
}
