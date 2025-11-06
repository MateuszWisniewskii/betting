use anchor_lang::prelude::*;
use crate::state::event::Event;

#[derive(Accounts)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        
    )]
    pub event: Account<'info, Event>,

    #[account()]
    pub system_program: Program<'info, System>
}

pub fn handler(ctx: Context<CreateEvent>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
