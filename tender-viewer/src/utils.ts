export const formatTitle = (title: string | undefined) => {
    if (!title) return '';
    return title
        .replace(/\[TESTING\]\s?/gi, '')
        .replace(/\[ТЕСТУВАННЯ\]\s?/gi, '')
        .replace(/\[ТЕСТИРОВАНИЕ\]\s?/gi, '')
        .trim();
};

export const formatAmount = (value: { amount: number, currency: string } | undefined) => {
    if (!value || value.amount === undefined) return 'N/A';
    // Format as $xx,xxx
    return `$${value.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
