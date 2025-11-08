use anchor_lang::prelude::*;
use crate::state::event::Event;

use crate::Bet;
use crate::error::BettingError;

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    #[account(mut)]
    pub bet: Account<'info, Bet>,
}

pub fn handler(ctx: Context<ClaimReward>) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let bet = &mut ctx.accounts.bet;
    let player = &mut ctx.accounts.player;

    require!(event.resolved, BettingError::EventNotResolved);
    require!(!bet.claimed, BettingError::AlreadyClaimed);
    require!(bet.event == event.key(), BettingError::InvalidEventLink);

    let result = event.result.unwrap();
    if bet.prediction == result {
        let winner_pool = if result == 0 {
            event.total_pool_a
        } else {
            event.total_pool_b
        };
        let reward = {
            event.total_pool as u128 * bet.amount as u128 / winner_pool as u128
        } as u64;

        **event.to_account_info().try_borrow_mut_lamports()? -= reward;
        **player.to_account_info().try_borrow_mut_lamports()? += reward;
    }
    bet.claimed = true;

    Ok(())
}
