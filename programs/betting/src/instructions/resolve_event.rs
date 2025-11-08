use anchor_lang::prelude::*;

use crate::Event;
use crate::error::BettingError;

#[derive(Accounts)]
pub struct ResolveEvent<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    pub event: Account<'info, Event>,

    #[account()]
    pub authority: Signer<'info>
}

pub fn handler(ctx: Context<ResolveEvent>, result: u8) -> Result<()> {
    let event = &mut ctx.accounts.event;

    require!(!event.resolved, BettingError::EventResolved);

    event.result = Some(result);
    event.resolved = true;
    
    Ok(())
}