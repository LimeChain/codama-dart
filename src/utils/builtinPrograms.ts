// Builtin Solana program mappings
export const BUILTIN_PROGRAMS: Record<string, string> = {
    // clockSysvar: 'SysvarC1ock11111111111111111111111111111111',
    // instructionsSysvar: 'Sysvar1nstructions1111111111111111111111111',
    // recentBlockhashesSysvar: 'SysvarRecentB1ockHashes11111111111111111111',
    // rentSysvar: 'SysvarRent111111111111111111111111111111111',
    // tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    systemProgram: '11111111111111111111111111111111',
};

export function getBuiltinProgramAddress(accountName: string): string | null {

    // Direct mapping
    if (BUILTIN_PROGRAMS[accountName]) {
        return BUILTIN_PROGRAMS[accountName];
    }

    // // Pattern matching for common variations
    // if (accountName === 'systemProgram') {
    //     return BUILTIN_PROGRAMS['systemProgram'];
    // }
    // if (lowerName.includes('token') && !lowerName.includes('associated')) {
    //     return BUILTIN_PROGRAMS['tokenProgram'];
    // }
    // if (lowerName.includes('rent')) {
    //     return BUILTIN_PROGRAMS['rentSysvar'];
    // }
    // if (lowerName.includes('clock')) {
    //     return BUILTIN_PROGRAMS['clockSysvar'];
    // }
    // if (lowerName.includes('instruction')) {
    //     return BUILTIN_PROGRAMS['instructionsSysvar'];
    // }

    return null;
}
