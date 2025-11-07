use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub player: Pubkey,
    pub prediction: u8,
    pub amount: u64,
    pub claimed: bool,
    pub event: Pubkey
}