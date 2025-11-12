use anchor_lang::prelude::*;

use crate::EventAccount;

#[derive(Accounts)]
pub struct InitializeEvent<'info> {
    #[account()]
    pub authority: Signer<'info>,

    #[account()]
    pub event_account: Account<'info, EventAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeEvent>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
