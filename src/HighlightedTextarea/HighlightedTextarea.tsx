import React, { useState, useEffect } from 'react';
import { Input } from 'antd';
import './HighlightedTextarea.scss';

const { TextArea } = Input;

// Типы токенов для подсветки
type TokenType =
  | 'logical-operator' // Логические операторы (AND, OR, NOT)
  | 'key' // Ключи (части перед знаком равенства)
  | 'value' // Значения (части после знака равенства)
  | 'quote' // Кавычки и их содержимое
  | 'parenthesis' // Скобки ( )
  | 'equals' // Знак равенства =
  | 'text'; // Простой текст

// Интерфейс для хранения информации о токене
interface Token {
  type: TokenType; // Тип токена
  value: string; // Значение токена
  start: number; // Начальная позиция в тексте
  end: number; // Конечная позиция в тексте
}

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const parseAndHighlight = (text: string): string => {
  const tokens: Token[] = []; // Массив для хранения найденных токенов
  let i = 0; // Текущая позиция в тексте
  const n = text.length; // Длина текста

  const logicalOperators = ['AND', 'OR', 'NOT'];

  // Проверка на пробельный символ
  const isWhitespace = (char: string): boolean => /\s/.test(char);

  // Основной цикл парсинга текста
  while (i < n) {
    // Пропускаем пробелы
    if (isWhitespace(text[i])) {
      i++;
      continue;
    }

    // Обрабатываем скобки
    if (text[i] === '(' || text[i] === ')') {
      tokens.push({
        type: 'parenthesis',
        value: text[i],
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // Обрабатываем знак равенства
    if (text[i] === '=') {
      tokens.push({
        type: 'equals',
        value: '=',
        start: i,
        end: i + 1,
      });
      i++;
      continue;
    }

    // Обрабатываем кавычки (поддерживаем ", ', ”)
    if (text[i] === '"' || text[i] === "'" || text[i] === '”') {
      const quoteType = text[i];
      const start = i;
      i++;

      // Ищем закрывающую кавычку (с учетом экранирования)
      while (i < n && (text[i] !== quoteType || (i > 0 && text[i - 1] === '\\'))) {
        i++;
      }

      if (i < n && text[i] === quoteType) {
        tokens.push({
          type: 'quote',
          value: text.substring(start, i + 1),
          start,
          end: i + 1,
        });
        i++;
      } else {
        // Если кавычка не закрыта
        tokens.push({
          type: 'quote',
          value: text.substring(start),
          start,
          end: n,
        });
        i = n;
      }
      continue;
    }

    // Проверяем логические операторы
    let matchedOperator = false;
    for (const op of logicalOperators) {
      if (text.substr(i, op.length).toUpperCase() === op) {
        // Проверяем, что около оператора пробелы
        const before = i === 0 || isWhitespace(text[i - 1]);
        const after = i + op.length >= n || isWhitespace(text[i + op.length]);

        if (before && after) {
          tokens.push({
            type: 'logical-operator',
            value: text.substring(i, i + op.length),
            start: i,
            end: i + op.length,
          });
          i += op.length;
          matchedOperator = true;
          break;
        }
      }
    }
    if (matchedOperator) continue;

    // Выделяем ключи
    if (i < n - 1) {
      // Ищем следующий знак равенства
      let equalsPos = i;
      while (equalsPos < n && text[equalsPos] !== '=') {
        equalsPos++;
      }

      if (equalsPos < n && text[equalsPos] === '=') {
        // Выделяем ключ
        let keyEnd = equalsPos;
        let keyStart = i;

        // Убираем пробелы перед знаком равенства
        while (keyEnd > keyStart && isWhitespace(text[keyEnd - 1])) {
          keyEnd--;
        }

        if (keyEnd > keyStart) {
          tokens.push({
            type: 'key',
            value: text.substring(keyStart, keyEnd),
            start: keyStart,
            end: keyEnd,
          });
          i = keyEnd;
          continue;
        }
      }
    }

    // Обрабатываем обычный текст
    const start = i;
    while (
      i < n &&
      !isWhitespace(text[i]) &&
      text[i] !== '(' &&
      text[i] !== ')' &&
      text[i] !== '=' &&
      text[i] !== '"' &&
      text[i] !== "'" &&
      text[i] !== '”'
    ) {
      i++;
    }

    if (i > start) {
      tokens.push({
        type: 'text',
        value: text.substring(start, i),
        start,
        end: i,
      });
    }
  }

  // Собираем HTML с подсветкой
  let result = '';
  let lastPos = 0;

  // Проходим по всем токенам и формируем HTML
  tokens.forEach((token) => {
    // Добавляем текст перед токеном
    if (token.start > lastPos) {
      result += escapeHtml(text.substring(lastPos, token.start));
    }

    // Добавляем сам токен с классом для стилизации
    result += `<span class="token-${token.type}">${escapeHtml(token.value)}</span>`;

    lastPos = token.end;
  });

  // Добавляем оставшийся текст
  if (lastPos < text.length) {
    result += escapeHtml(text.substring(lastPos));
  }

  return result;
};

export const HighlightedTextarea: React.FC = () => {
  const [value, setValue] = useState<string>('');

  const [highlightedHtml, setHighlightedHtml] = useState<string>('');

  // Эффект для обновления подсвеченного текста при изменении value
  useEffect(() => {
    setHighlightedHtml(parseAndHighlight(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(e.target.value);
  };

  return (
    <div className="highlighted-textarea-container">
      <TextArea
        value={value}
        onChange={handleChange}
        autoSize={{ minRows: 3 }}
        className="highlighted-textarea"
        placeholder="Сюда текст"
      />

      <div className="highlight-preview" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
    </div>
  );
};
