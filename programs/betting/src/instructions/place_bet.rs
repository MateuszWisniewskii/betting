use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::{BetAccount, EventAccount, OptionAccount, VaultAccount, event_account};

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64, option: String)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

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

    #[account(
        mut,
        seeds = [b"vault".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,

    #[account(
        init,
        payer = player,
        space = 8 + BetAccount::INIT_SPACE,
        seeds = [b"bet".as_ref(), player.key().as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bet_account: Account<'info, BetAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBet>, _event_id: u64, option: String, amount: u64) -> Result<()> {
    let option_account = &mut ctx.accounts.option_account;
    let current_time = Clock::get()?.unix_timestamp;
    let system_program = &ctx.accounts.system_program;
    let vault = &ctx.accounts.vault_account;
    let player = &ctx.accounts.player;
    let bet = &mut ctx.accounts.bet_account;
    let event_account = &mut ctx.accounts.event_account;

    bet.player = player.key();
    bet.event_id = _event_id;
    bet.option = option;
    bet.amount = amount;
    bet.reward_claimed = false;

    if current_time > (event_account.betting_end as i64) {
        return Err(ErrorCode::BettingEnded.into());
    }

    if current_time <= (event_account.betting_start as i64) {
        return Err(ErrorCode::BettingNotStarted.into());
    }

    option_account.option_votes += 1;
    option_account.option_pool += amount;
    event_account.total_pool += amount;

    let transfer_context = CpiContext::new(
        system_program.to_account_info(),
        Transfer {
            from: player.to_account_info(),
            to: vault.to_account_info(),
        },
    );

    transfer(transfer_context, amount)?;

    Ok(())
}
