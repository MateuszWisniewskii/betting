use anchor_lang::prelude::*;

use crate::{EventAccount, VaultAccount};

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

    #[account(
        init,
        payer = authority,
        space = 8 + VaultAccount::INIT_SPACE,
        seeds = [b"vault".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,

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
    let event = &mut ctx.accounts.event_account;
    event.event_name = event_name;
    event.event_description = event_description;
    event.betting_start = start_time;
    event.betting_end = end_time;
    event.betting_options_index = 0;
    event.event_resolved = false;
    event.total_pool = 0;
    
    Ok(())
}
