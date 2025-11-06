use anchor_lang::prelude::*;

#[account]
pub struct Event {
    pub authority: Pubkey, // klucz admina, lub innego podmiotu tworzącego wydarzenie
    pub description: String, // opis wydarzenia np. FC Barcelona vs Real Madryt
    pub reuslt: Option<u8>,
    pub total_pool: u64,
    pub total_pool_a: u64,
    pub total_pool_b: u64,
    pub resolved: bool
}