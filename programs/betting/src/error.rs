use anchor_lang::prelude::*;

#[error_code]
pub enum BettingError {
    #[msg("Nieprawidłowy wynik obstawiania (musi być 0 lub 1)")]
    InvalidPrediction,
    #[msg("Wydarzenie sie zakończyło, zostało rozliczone")]
    EventResolved,
}
