use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BetAccount {
    pub player: Pubkey, // klucz gracza oddającego głos
    pub event_id: u64,
    #[max_len(20)]
    pub option: String, // nazwa opcji, na którą zagłosował dany gracz
    pub amount: u64,          // kwota obstawiona przez gracza
    pub reward_claimed: bool, // flaga zabespieczająca przed kilkukrotnym odbieraniem nagrody
    pub bet_placed: bool,
}
