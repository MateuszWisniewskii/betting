use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{EVENT_SEED, EventAccount, OPTION_SEED, OptionAccount, VAULT_SEED};

use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(_event_id: u64, winning_option: String)]
pub struct ResolveEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
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

    #[account(
        mut,
        seeds = [OPTION_SEED.as_bytes(), _event_id.to_le_bytes().as_ref(), winning_option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolveEvent>, _event_id: u64, winning_option: String) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let winning_option_account = &ctx.accounts.option_account;
    let event = &mut ctx.accounts.event_account;

    let vault = &ctx.accounts.vault_account;
    let authority = &ctx.accounts.authority;
    let system_program = &ctx.accounts.system_program;
    if current_time < (event.betting_end as i64) {
        return Err(ErrorCode::EventDoesNotEnded.into());
    }

    let total_vault_lamports = vault.to_account_info().lamports();

    let fee_amount = total_vault_lamports
        .checked_mul(5)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(100)
        .ok_or(ErrorCode::Overflow)?;

    if fee_amount == 0 {
        msg!("Pula jest za mała, aby pobrać prowizję.");
    } else {
        let bump = ctx.bumps.vault_account;
        let event_id_bytes = _event_id.to_le_bytes();
        let vault_seeds = &[b"vault".as_ref(), event_id_bytes.as_ref(), &[bump]];
        let signer_seeds = &[&vault_seeds[..]];

        let transfer_context = CpiContext::new_with_signer(
            system_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: authority.to_account_info(),
            },
            signer_seeds,
        );

        // Wykonujemy transfer 5% na konto authority
        transfer(transfer_context, fee_amount)?;
        msg!("Pobrano prowizję: {} lamportów (5% całej puli) na konto authority.", fee_amount);
    }

    // Aktualizujemy event.total_pool po odliczeniu prowizji,
    event.total_pool = event.total_pool.checked_sub(fee_amount).ok_or(ErrorCode::Overflow)?;

    event.winning_option = winning_option;
    event.winning_votes_counter = winning_option_account.option_votes;
    event.event_resolved = true;

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
