use anchor_lang::prelude::*;

use crate::{ANCHOR_DISCRIMINATOR_SIZE, EVENT_SEED, EventAccount, VAULT_SEED};

#[derive(Accounts)]
#[instruction(_event_id: u64)]
pub struct InitializeEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // admin bądź inna jednostka autoryzująca wydarzenie

    #[account(
        init,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + EventAccount::INIT_SPACE,
        seeds = [EVENT_SEED.as_bytes(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,

    /// CHECK: There is no data. Konto do trzymania waluty.
    #[account(
        mut,
        seeds = [VAULT_SEED.as_bytes(), _event_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: AccountInfo<'info>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeEvent>,
    _event_id: u64,
    start_time: u64,
    end_time: u64,
    event_name: String,
    event_description: String,
) -> Result<()> {
    let event = &mut ctx.accounts.event_account;
    let _vault = &mut ctx.accounts.vault_account;

    event.authority = ctx.accounts.authority.key();
    event.event_name = event_name;
    event.event_description = event_description;
    event.betting_start = start_time;
    event.betting_end = end_time;
    event.betting_options_index = 0;
    event.event_resolved = false;
    event.total_pool = 0;
    event.winning_option = "Jeszcze nie ma zwycięzcy".to_string();
    event.total_pool = 0;

    msg!("Zostało utworzone wydarzenie");
    msg!("Nazwa wydarzenia: {}", event.event_name);
    msg!("Opis wydarzenia: {}", event.event_description);
    msg!(
        "Termin rozpoczęcia przyjmowania zakładów: {}",
        event.betting_start
    );
    msg!(
        "Termin zakończenia przyjmowania zakładów: {}",
        event.betting_end
    );
    msg!(
        "Aktualna liczba drużyn birących udział w wydarzeniu: {}",
        event.betting_options_index
    );
    msg!(
        "Czy wydarzenie zostało zakończone?: {}",
        event.event_resolved
    );
    msg!("Nazwa zwycięskiej drużyny: {}", event.winning_option);
    msg!("Całkowita pula: {}", event.total_pool);

    Ok(())
}
