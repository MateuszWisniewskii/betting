use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Event {
    pub authority: Pubkey, // klucz admina, lub innego podmiotu tworzącego wydarzenie
    #[max_len(50)]
    pub description: String, // opis wydarzenia np. FC Barcelona vs Real Madryt
    //#[max_len(2, 30)]
    pub result: Option<u8>,  //Vec<String>, // gdy nie pyknie, spróbować tego: Option<u8>
    pub total_pool: u64,
    pub total_pool_a: u64,
    pub total_pool_b: u64,
    pub resolved: bool
}