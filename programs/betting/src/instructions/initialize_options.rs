use anchor_lang::prelude::*;

use crate::{EventAccount, OptionAccount};

#[derive(Accounts)]
#[instruction(_event_id: u64, option: String)]
pub struct InitializeOptions<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + OptionAccount::INIT_SPACE,
        seeds = [b"option_seed".as_ref(), _event_id.to_le_bytes().as_ref(), option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    #[account(mut)]
    pub event_account: Account<'info, EventAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeOptions>, _event_id: u64, option: String) -> Result<()> {
    //msg!("Greetings from: {:?}", ctx.program_id);
    ctx.accounts.option_account.option_name = option;
    ctx.accounts.option_account.option_votes = 0;
    ctx.accounts.event_account.betting_options_index += 1;
    Ok(())
}
