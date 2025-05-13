import logger from  './logger';
export const mockValidateEmail = async (email: string): Promise<{ isValid: boolean, error?: string }> => {
    logger.info('Validating email:', email);
    return new Promise((resolve) => {
        setTimeout(() => {
            if (email.includes('@')) {
                resolve({ isValid: true });
            } else {
                resolve({ isValid: false, error: 'Invalid email address' });
            }
        }, 100);
    });

}