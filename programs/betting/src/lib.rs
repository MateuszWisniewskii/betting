pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("CBfwB3eCacRAXek6YNwJ6DVMRZNYJk55r9km2yPp3cXB");

#[program]
pub mod betting {
    use super::*;

    pub fn initialize_event(
        ctx: Context<InitializeEvent>,
        _event_id: u64,
        start_time: u64,
        end_time: u64,
        event_name: String,
        event_description: String,
    ) -> Result<()> {
        initialize_event::handler(
            ctx,
            _event_id,
            start_time,
            end_time,
            event_name,
            event_description,
        )
    }

    pub fn initialize_options(
        ctx: Context<InitializeOptions>,
        _event_id: u64,
        option: String,
    ) -> Result<()> {
        initialize_options::handler(ctx, _event_id, option)
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        _event_id: u64,
        option: String,
        amount: u64,
    ) -> Result<()> {
        place_bet::handler(ctx, _event_id, option, amount)
    }

    pub fn resolve_event(
        ctx: Context<ResolveEvent>,
        _event_id: u64,
        winning_option: String,
    ) -> Result<()> {
        resolve_event::handler(ctx, _event_id, winning_option)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>, _event_id: u64) -> Result<()> {
        claim_reward::handler(ctx, _event_id)
    }
}
