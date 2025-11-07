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

    pub fn create_event(ctx: Context<CreateEvent>, event_index: u64) -> Result<()> {
        create_event::handler(ctx, event_index)
    }
}
