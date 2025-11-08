use anchor_lang::prelude::*;

use crate::error::BettingError;
use crate::{Bet, Event, ANCHOR_DISCRIMINATOR_SIZE};
use anchor_lang::system_program::{transfer, Transfer};

#[derive(Accounts)]
#[instruction(event_index: u64)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub event: Account<'info, Event>,

    #[account(
        init,
        payer = player,
        space = ANCHOR_DISCRIMINATOR_SIZE + Bet::INIT_SPACE,
        seeds = [
            b"bet",
            player.key().as_ref(),
            &event_index.to_le_bytes()
        ],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PlaceBet>,
    prediction: u8,
    amount: u64,
    event_index: u64,
) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let bet = &mut ctx.accounts.bet;
    let player = &ctx.accounts.player;
    let system_program = &ctx.accounts.system_program;

    require!(
        prediction == 0 || prediction == 1,
        BettingError::InvalidPrediction
    );
    require!(!event.resolved, BettingError::EventResolved);

    transfer(
        CpiContext::new(
            system_program.to_account_info(),
            Transfer {
                from: player.to_account_info(),
                to: event.to_account_info(),
            },
        ),
        amount,
    );

    bet.player = player.key();
    bet.prediction = prediction;
    bet.amount = amount;
    bet.claimed = false;
    bet.event = event.key();

    event.total_pool += amount;
    if prediction == 0 {
        event.total_pool_a += amount;
    } else {
        event.total_pool_b += amount;
    }
    Ok(())
}
