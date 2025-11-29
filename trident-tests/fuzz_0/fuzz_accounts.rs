use trident_fuzz::fuzzing::*;

/// Storage for all account addresses used in fuzz testing.
///
/// This struct serves as a centralized repository for account addresses,
/// enabling their reuse across different instruction flows and test scenarios.
///
/// Docs: https://ackee.xyz/trident/docs/latest/trident-api-macro/trident-types/fuzz-accounts/
#[derive(Default)]
pub struct AccountAddresses {
    pub player: AddressStorage,

    pub vault_account: AddressStorage,

    pub bet_account: AddressStorage,

    pub event_account: AddressStorage,

    pub option_account: AddressStorage,

    pub system_program: AddressStorage,

    pub authority: AddressStorage,
}
