import React, { useState, useEffect } from 'react';
import { Input } from 'antd';
import './HighlightedTextarea.scss';

const { TextArea } = Input;

type TokenType = 'logical-operator' | 'key' | 'value' | 'quote' | 'parenthesis' | 'equals' | 'text';

interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export const HighlightedTextarea: React.FC = () => {
  const [value, setValue] = useState('');
  const [highlightedHtml, setHighlightedHtml] = useState('');

  // Функция для парсинга текста и выделения элементов
  const parseAndHighlight = (text: string) => {
    const tokens: Token[] = [];
    let i = 0;
    const n = text.length;

    const logicalOperators = ['AND', 'OR', 'NOT'];
    const isWhitespace = (char: string) => /\s/.test(char);

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

      // Обрабатываем кавычки: ”, ", '
      if (text[i] === '"' || text[i] === "'" || text[i] === '”') {
        const quoteType = text[i];
        const start = i;
        i++;

        // Ищем закрывающую кавычку с учетом экранирования
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
          // Незакрытая кавычка
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
          // Проверяем, что это отдельное слово
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

      // Выделяем ключи (логические префиксы перед знаком =)
      if (i < n - 1) {
        // Ищем следующий знак равенства
        let equalsPos = i;
        while (equalsPos < n && text[equalsPos] !== '=') {
          equalsPos++;
        }

        if (equalsPos < n && text[equalsPos] === '=') {
          // Выделяем ключ (все от текущей позиции до знака равенства)
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

      // Обычный текст
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

    // Генерируем HTML с подсветкой
    let result = '';
    let lastPos = 0;

    tokens.forEach((token) => {
      // Добавляем текст перед токеном
      if (token.start > lastPos) {
        result += escapeHtml(text.substring(lastPos, token.start));
      }

      // Добавляем токен с соответствующим классом
      result += `<span class="token-${token.type}">${escapeHtml(token.value)}</span>`;

      lastPos = token.end;
    });

    // Добавляем оставшийся текст
    if (lastPos < text.length) {
      result += escapeHtml(text.substring(lastPos));
    }

    return result;
  };

  // Экранирование HTML для безопасного вставки
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  useEffect(() => {
    setHighlightedHtml(parseAndHighlight(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  return (
    <div className="highlighted-textarea-container">
      <TextArea
        value={value}
        onChange={handleChange}
        autoSize={{ minRows: 3 }}
        className="highlighted-textarea"
      />
      <div className="highlight-preview" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
    </div>
  );
};
