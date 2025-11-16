use anchor_lang::prelude::*;

use crate::{error::ErrorCode, BetAccount, EventAccount, VaultAccount};

#[derive(Accounts)]
#[instruction(_event_id: u64)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,

    #[account(
        mut,
        seeds = [b"bet".as_ref(), player.key().as_ref(), _event_id.to_le_bytes().as_ref()],
        bump,
        constraint = bet_account.player == player.key()
    )]
    pub bet_account: Account<'info, BetAccount>,

    #[account(
        mut,
        seeds = [b"event_seed".as_ref(), _event_id.to_le_bytes().as_ref()],
        bump,
        constraint = event_account.event_resolved
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimReward>, _event_id: u64) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let bet = &mut ctx.accounts.bet_account;
    let vault = &mut ctx.accounts.vault_account;
    let event = &mut ctx.accounts.event_account;
    let current_time = Clock::get()?.unix_timestamp;

    if current_time < (event.betting_start as i64) {
        return Err(ErrorCode::BettingNotStarted.into());
    }

    if current_time < (event.betting_end as i64) {
        return Err(ErrorCode::EventDoesNotEnded.into());
    }

    if event.event_resolved == false {
        return Err(ErrorCode::EventIsNotResolved.into());
    }

    if bet.reward_claimed == true {
        return Err(ErrorCode::RewardAlreadyClaimed.into());
    }

    if bet.option != event.winning_option {
        bet.reward_claimed = true;
        msg!("Niestety, twoja drużyna nie wygrała, nie należy ci się nagroda");
        return Ok(());
    }

    //payout = (user_bet_amount / total_bets_on_winner) * total_vault_balance
    

    

    Ok(())
}
