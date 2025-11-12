use anchor_lang::prelude::*;

use crate::{EventAccount, OptionAccount};

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64, option: String)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

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

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBet>, _event_id: u64, option: String) -> Result<()> {
    let option_account = &mut ctx.accounts.option_account;
    let current_time = Clock::get()?.unix_timestamp;

    if current_time > (ctx.accounts.event_account.betting_end as i64) {
        return Err(ErrorCode::BettingEnded.into());
    }

    if current_time <= (ctx.accounts.event_account.betting_start as i64) {
        return Err(ErrorCode::BettingNotStarted.into());
    }

    option_account.option_votes += 1;

    Ok(())
}
