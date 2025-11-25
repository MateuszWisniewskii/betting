use anchor_lang::prelude::*;

use crate::EventAccount;

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64)]
pub struct ResolveEvent<'info> {
    #[account()]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"event_seed".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolveEvent>, _event_id: u64, winning_option: String) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let event = &mut ctx.accounts.event_account;

    if current_time < (event.betting_end as i64) {
        return Err(ErrorCode::EventDoesNotEnded.into());
    }

    event.winning_option = winning_option;
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
