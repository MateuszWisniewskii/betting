use anchor_lang::prelude::*;

use crate::{error::ErrorCode,EventAccount, OptionAccount, ANCHOR_DISCRIMINATOR_SIZE};

#[derive(Accounts)]
#[instruction(_event_id: u64, option: String)]
pub struct InitializeOptions<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + OptionAccount::INIT_SPACE,
        seeds = [b"option_seed".as_ref(), _event_id.to_le_bytes().as_ref(), option.as_ref()],
        bump
    )]
    pub option_account: Account<'info, OptionAccount>,

    #[account(
        mut,
        has_one = authority,
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeOptions>, _event_id: u64, option: String) -> Result<()> {
    let option_account = &mut ctx.accounts.option_account;
    let event = &mut ctx.accounts.event_account;
    let current_time = Clock::get()?.unix_timestamp;

    if current_time > (event.betting_start as i64) {
        return Err(ErrorCode::AddingOptionsAfterBettingStart.into());
    }

    option_account.option_name = option;
    option_account.option_votes = 0;
    option_account.option_pool = 0;
    event.betting_options_index += 1;

    msg!("Nazwa drużyny: {}", option_account.option_name);
    msg!("Ilość oddanych zakładów: {}", option_account.option_votes);
    msg!(
        "Łączna wartość zakładów na daną drużynę: {}",
        option_account.option_pool
    );

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
