use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct OptionAccount {
    #[max_len(20)]
    pub option_name: String, // nazwa danej opcji do zagłosowania np. nazwa drużyny piłkarskiej
    pub option_votes: u64, // liczba zakładów
    pub option_total_pool: u64, // łączna liczba waluty obstawionej na daną opcję/drużynę
}
