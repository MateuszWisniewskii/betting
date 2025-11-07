use anchor_lang::prelude::*;
use crate::state::event::Event;
use crate::ANCHOR_DISCRIMINATOR_SIZE;

#[derive(Accounts)]
#[instruction(event_index: u64)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + Event::INIT_SPACE,
        seeds = [
            b"event", 
            authority.key().as_ref(),
            &event_index.to_le_bytes()
            ],
        bump
    )]
    pub event: Account<'info, Event>,

    #[account()]
    pub system_program: Program<'info, System>
}

pub fn handler(ctx: Context<CreateEvent>, event_index: u64) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    
    Ok(())
}
