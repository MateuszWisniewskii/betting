use anchor_lang::prelude::*;

// #[constant] // Nie działa z tym makro, gdy chcę dodac to do space ->  #[account(... space = ANCHOR_DISCRIMINATOR_SIZE + Event::INIT_SPACE ...)]
pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8 ;
