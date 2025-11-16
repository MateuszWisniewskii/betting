use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;

use crate::{EventAccount, OptionAccount};
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(event_id: u64, winning_option: String)]
pub struct ResolveEvent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"event_seed", event_id.to_le_bytes().as_ref()],
        bump,
        constraint = !event_account.event_resolved @ ErrorCode::EventAlreadyResolved
    )]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        mut,
        seeds = [b"option_seed", event_id.to_le_bytes().as_ref(), winning_option.as_ref()],
        bump
    )]
    pub winning_option_account: Account<'info, OptionAccount>,

    #[account(
        mut,
        seeds = [b"vault", event_id.to_le_bytes().as_ref(), winning_option.as_ref()],
        bump
    )]
    /// CHECK: PDA vault, który trzyma środki zwycięskiej drużyny
    pub winning_vault: AccountInfo<'info>,

    #[account()]
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ResolveEvent>,
    event_id: u64,
    winning_option: String,
) -> Result<()> {
    let event_account = &mut ctx.accounts.event_account;

    // oznacz event jako zakończony
    event_account.event_resolved = true;
    event_account.winning_option = Some(winning_option.clone());

    let event_id_bytes = event_id.to_le_bytes();

    // (opcjonalnie) przetransferuj całą pulę do authority (admina)
    let vault_balance = **ctx.accounts.winning_vault.lamports.borrow();
    let seeds = &[
        b"vault",
        event_id.as_ref(),
        winning_option.as_bytes(),
        &[ctx.bumps.winning_vault],
    ];

    invoke_signed(
        &system_instruction::transfer(
            &ctx.accounts.winning_vault.key(),
            &ctx.accounts.authority.key(),
            vault_balance,
        ),
        &[
            ctx.accounts.winning_vault.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[&seeds[..]],
    )?;

    Ok(())
}
