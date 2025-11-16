use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct OptionAccount {
    #[max_len(20)]
    pub option_name: String,
    pub option_votes: u64,
    pub option_pool: u64,
}
