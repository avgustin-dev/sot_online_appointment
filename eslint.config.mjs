import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16+ поставляет готовый flat config — оборачивать его в
 * FlatCompat (@eslint/eslintrc) больше нельзя: react-hooks-плагин там сам на
 * себя ссылается, и eslintrc падает при попытке сериализовать ошибку в JSON
 * ("Converting circular structure to JSON"). Подключаем flat-конфиги напрямую.
 */
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript];

export default eslintConfig;
