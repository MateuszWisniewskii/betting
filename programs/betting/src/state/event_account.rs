use anchor_lang::prelude::*;

#[account]
pub struct EventAccount {
    pub event_name: String, // nazwa wydarzenia np. drużyna A vs drużyna B
    pub event_description: String, // opis wydarzenia
    pub betting_start: u64, // moment rozpoczęcia możliwości obstawiania
    pub betting_end: u64, // moment zakończenia możliwości obstawiania
    pub betting_options_indeks: u64, // liczba opisująca ilość kandydatów/opcji do głosowania (w przypadku piłki nożnej będą tylko dwie opcje)
    pub event_resolved: bool, // zmienna warunkująca, kiedy wydarzenie się skończyło i można odbierać nagrodę 
}
