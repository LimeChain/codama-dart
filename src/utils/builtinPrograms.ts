export const BUILTIN_PROGRAMS: Record<string, string> = {
    systemProgram: '11111111111111111111111111111111',
};

export function getBuiltinProgramAddress(accountName: string): string | null {
    return BUILTIN_PROGRAMS[accountName] || null;
}
