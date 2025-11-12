pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("EuDe8zmbZeYuaADaJjp8F9zCHm9L7LuAvrsvqLdSCXN4");

#[program]
pub mod betting {
    use super::*;

    pub fn initialize_event(ctx: Context<InitializeEvent>, _event_id: u64, start_time: u64, end_time: u64, event_name: String, event_description: String) -> Result<()> {
        initialize_event::handler(ctx, _event_id, start_time, end_time, event_name, event_description)
    }

    pub fn initialize_options(ctx: Context<InitializeOptions>, _event_id: u64, option: String) -> Result<()> {
        initialize_options::handler(ctx, _event_id, option)
    }
}
