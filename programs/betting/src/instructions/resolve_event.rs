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

pub fn handler(ctx: Context<ResolveEvent>, _event_id: u64) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let event = &mut ctx.accounts.event_account;

    if current_time < (event.betting_end as i64) {
        return Err(ErrorCode::EventDoesNotEnded.into());
    }

    event.event_resolved = true;

    Ok(())
}
