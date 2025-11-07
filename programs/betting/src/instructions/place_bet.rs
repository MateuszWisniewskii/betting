use anchor_lang::prelude::*;

use crate::{ANCHOR_DISCRIMINATOR_SIZE, Bet};

#[derive(Accounts)]
#[instruction(event_index: u64)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

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

pub fn handler(ctx: Context<PlaceBet>, prediction: u8, amount: u64, event_index: u64) -> Result<()> {
    Ok(())
}