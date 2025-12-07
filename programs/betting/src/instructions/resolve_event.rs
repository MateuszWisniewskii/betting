use anchor_lang::prelude::*;

use crate::{EventAccount, OptionAccount};

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64, winning_option: String)]
pub struct ResolveEvent<'info> {
    #[account()]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
        seeds = [b"event_seed".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        seeds = [b"option_seed".as_ref(), _event_id.to_le_bytes().as_ref(), winning_option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolveEvent>, _event_id: u64, winning_option: String) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let winning_option_account = &ctx.accounts.option_account;
    let event = &mut ctx.accounts.event_account;

    if current_time < (event.betting_end as i64) {
        return Err(ErrorCode::EventDoesNotEnded.into());
    }

    event.winning_option = winning_option;
    event.winning_votes_counter = winning_option_account.option_votes;
    event.event_resolved = true;

    msg!("Nazwa wydarzenia: {}", event.event_name);
    msg!("Opis wydarzenia: {}", event.event_description);
    msg!(
        "Termin rozpoczęcia przyjmowania zakładów: {}",
        event.betting_start
    );
    msg!(
        "Termin zakończenia przyjmowania zakładów: {}",
        event.betting_end
    );
    msg!(
        "Aktualna liczba drużyn birących udział w wydarzeniu: {}",
        event.betting_options_index
    );
    msg!(
        "Czy wydarzenie zostało zakończone?: {}",
        event.event_resolved
    );
    msg!(
        "Nazwa zwycięskiej drużyny: {}",
        event.winning_option
    );
    msg!("Całkowita pula: {}", event.total_pool);

    Ok(())
}
