use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Obstawianie jeszcze się nie zaczęło")]
    BettingNotStarted,
    #[msg("Obstawianie zakończyło się")]
    BettingEnded,
}
