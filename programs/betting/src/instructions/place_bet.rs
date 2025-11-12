use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;

use crate::{EventAccount, OptionAccount};

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64, _option: String)]
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
        seeds = [b"option_seed".as_ref(), _event_id.to_le_bytes().as_ref(), _option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref(), _event_id.to_le_bytes().as_ref(), _option.as_ref()],
        bump
    )]
    /// CHECK: vault PDA, który trzyma SOL dla danej opcji
    pub vault_account: AccountInfo<'info>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBet>, _event_id: u64, _option: String, amount: u64) -> Result<()> {
    let option_account = &mut ctx.accounts.option_account;
    let event_account = &mut ctx.accounts.event_account;
    let current_time = Clock::get()?.unix_timestamp;

    if current_time > (event_account.betting_end as i64) {
        return Err(ErrorCode::BettingEnded.into());
    }

    if current_time <= (event_account.betting_start as i64) {
        return Err(ErrorCode::BettingNotStarted.into());
    }

    let tx = transfer(
        &ctx.accounts.signer.key(),
        &ctx.accounts.vault_account.key(),
        amount,
    );

    invoke(
        &tx,
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.vault_account.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    option_account.option_votes += 1;
    option_account.option_total_pool += amount;
    event_account.total_pool += amount;

    Ok(())
}
