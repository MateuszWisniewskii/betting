use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Obstawianie jeszcze się nie zaczęło")]
    BettingNotStarted,
    #[msg("Obstawianie zakończyło się")]
    BettingEnded,
    #[msg("Wydarzenie jeszcze się nie skończyło")]
    EventDoesNotEnded,
    #[msg("Wydarzenie jeszcze nie zostało rozwiązane przez authority")]
    EventIsNotResolved,
    #[msg("Nagroda została już odebrana")]
    RewardAlreadyClaimed,
    #[msg("Obstawiana kwota nie może być ujemna, ani zerowa")]
    InvalidBetAmount,
    #[msg("Zakład został już złożony, nie można głosować drugi raz")]
    BetAlreadyPlaced
}
