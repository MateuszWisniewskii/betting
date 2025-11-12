use anchor_lang::prelude::*;

use crate::EventAccount;

#[derive(Accounts)]
#[instruction(_event_id: u64)]
pub struct InitializeEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // admin bądź inna jednostka autoryzująca wydarzenie

    #[account(
        init,
        payer = authority,
        space = 8 + EventAccount::INIT_SPACE,
        seeds = [b"event_seed".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeEvent>,
    _event_id: u64,
    start_time: u64,
    end_time: u64,
    event_name: String,
    event_description: String,
) -> Result<()> {
    //msg!("Greetings from: {:?}", ctx.program_id);
    ctx.accounts.event_account.event_name = event_name;
    ctx.accounts.event_account.event_description = event_description;
    ctx.accounts.event_account.betting_start = start_time;
    ctx.accounts.event_account.betting_end = end_time;
    ctx.accounts.event_account.betting_options_index = 0;
    ctx.accounts.event_account.event_resolved = false;
    Ok(())
}
