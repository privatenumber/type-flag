'use strict';

const kebabCasePattern = /-(\w)/g;
const toCamelCase = (string) => string.replace(kebabCasePattern, (_, afterHyphenCharacter) => afterHyphenCharacter.toUpperCase());
const camelCasePattern = /\B([A-Z])/g;
const toKebabCase = (string) => string.replace(camelCasePattern, "-$1").toLowerCase();
const { stringify } = JSON;
const { hasOwnProperty } = Object.prototype;
const hasOwn = (object, property) => hasOwnProperty.call(object, property);
const flagPrefixPattern = /^--?/;
const valueDelimiterPattern = /[.:=]/;
const parseFlag = (flagArgv) => {
  let flagName = flagArgv.replace(flagPrefixPattern, "");
  let flagValue;
  const hasValueDalimiter = flagName.match(valueDelimiterPattern);
  if (hasValueDalimiter == null ? void 0 : hasValueDalimiter.index) {
    const equalIndex = hasValueDalimiter.index;
    flagValue = flagName.slice(equalIndex + 1);
    flagName = flagName.slice(0, equalIndex);
  }
  return {
    flagName,
    flagValue
  };
};
const reservedCharactersPattern = /[\s.:=]/;
const validateFlagName = (schemas, flagName) => {
  const errorPrefix = `Invalid flag name ${stringify(flagName)}:`;
  if (flagName.length === 0) {
    throw new Error(`${errorPrefix} flag name cannot be empty}`);
  }
  if (flagName.length === 1) {
    throw new Error(`${errorPrefix} single characters are reserved for aliases`);
  }
  const hasReservedCharacter = flagName.match(reservedCharactersPattern);
  if (hasReservedCharacter) {
    throw new Error(`${errorPrefix} flag name cannot contain the character ${stringify(hasReservedCharacter == null ? void 0 : hasReservedCharacter[0])}`);
  }
  let checkDifferentCase;
  if (kebabCasePattern.test(flagName)) {
    checkDifferentCase = toCamelCase(flagName);
  } else if (camelCasePattern.test(flagName)) {
    checkDifferentCase = toKebabCase(flagName);
  }
  if (checkDifferentCase && hasOwn(schemas, checkDifferentCase)) {
    throw new Error(`${errorPrefix} collides with flag ${stringify(checkDifferentCase)}`);
  }
};
function mapAliases(schemas) {
  const aliases = /* @__PURE__ */ new Map();
  for (const flagName in schemas) {
    if (!hasOwn(schemas, flagName)) {
      continue;
    }
    validateFlagName(schemas, flagName);
    const schema = schemas[flagName];
    if (schema && typeof schema === "object") {
      const { alias } = schema;
      if (typeof alias === "string") {
        if (alias.length === 0) {
          throw new Error(`Invalid flag alias ${stringify(flagName)}: flag alias cannot be empty`);
        }
        if (alias.length > 1) {
          throw new Error(`Invalid flag alias ${stringify(flagName)}: flag aliases can only be a single-character`);
        }
        if (aliases.has(alias)) {
          throw new Error(`Flag collision: Alias "${alias}" is already used`);
        }
        aliases.set(alias, {
          name: flagName,
          schema
        });
      }
    }
  }
  return aliases;
}
const isArrayType = (schema) => {
  if (!schema || typeof schema === "function") {
    return false;
  }
  return Array.isArray(schema) || Array.isArray(schema.type);
};
const createFlagsObject = (schema) => {
  const flags = {};
  for (const flag in schema) {
    if (hasOwn(schema, flag)) {
      flags[flag] = isArrayType(schema[flag]) ? [] : void 0;
    }
  }
  return flags;
};
const getDefaultFromTypeWithValue = (typeFunction, value) => {
  if (typeFunction === Number && value === "") {
    return Number.NaN;
  }
  if (typeFunction === Boolean) {
    return value !== "false";
  }
  return value;
};
const validateFlags = (schemas, flags) => {
  for (const flagName in schemas) {
    if (!hasOwn(schemas, flagName)) {
      continue;
    }
    const schema = schemas[flagName];
    if (!schema) {
      continue;
    }
    const value = flags[flagName];
    if (value !== void 0 && !(Array.isArray(value) && value.length === 0)) {
      continue;
    }
    if ("default" in schema) {
      let defaultValue = schema.default;
      if (typeof defaultValue === "function") {
        defaultValue = defaultValue();
      }
      flags[flagName] = defaultValue;
    }
  }
};
const getFlagType = (flagName, flagSchema) => {
  if (!flagSchema) {
    throw new Error(`Missing type on flag "${flagName}"`);
  }
  if (typeof flagSchema === "function") {
    return flagSchema;
  }
  if (Array.isArray(flagSchema)) {
    return flagSchema[0];
  }
  return getFlagType(flagName, flagSchema.type);
};

const isAliasPattern = /^-[\da-z]+/i;
const isFlagPattern = /^--[\w-]{2,}/;
const END_OF_FLAGS = "--";
function typeFlag(schemas, argv = process.argv.slice(2)) {
  const aliasesMap = mapAliases(schemas);
  const parsed = {
    flags: createFlagsObject(schemas),
    unknownFlags: {},
    _: Object.assign([], {
      [END_OF_FLAGS]: []
    })
  };
  let expectingValue;
  const setKnown = (flagName, flagSchema, flagValue) => {
    const flagType = getFlagType(flagName, flagSchema);
    flagValue = getDefaultFromTypeWithValue(flagType, flagValue);
    if (flagValue !== void 0 && !Number.isNaN(flagValue)) {
      if (Array.isArray(parsed.flags[flagName])) {
        parsed.flags[flagName].push(flagType(flagValue));
      } else {
        parsed.flags[flagName] = flagType(flagValue);
      }
    } else {
      expectingValue = (value) => {
        if (Array.isArray(parsed.flags[flagName])) {
          parsed.flags[flagName].push(flagType(getDefaultFromTypeWithValue(flagType, value || "")));
        } else {
          parsed.flags[flagName] = flagType(getDefaultFromTypeWithValue(flagType, value || ""));
        }
        expectingValue = void 0;
      };
    }
  };
  const setUnknown = (flagName, flagValue) => {
    if (!(flagName in parsed.unknownFlags)) {
      parsed.unknownFlags[flagName] = [];
    }
    if (flagValue !== void 0) {
      parsed.unknownFlags[flagName].push(flagValue);
    } else {
      expectingValue = (value = true) => {
        parsed.unknownFlags[flagName].push(value);
        expectingValue = void 0;
      };
    }
  };
  for (let i = 0; i < argv.length; i += 1) {
    const argvElement = argv[i];
    if (argvElement === END_OF_FLAGS) {
      const endOfFlags = argv.slice(i + 1);
      parsed._[END_OF_FLAGS] = endOfFlags;
      parsed._.push(...endOfFlags);
      break;
    }
    const isAlias = isAliasPattern.test(argvElement);
    const isFlag = isFlagPattern.test(argvElement);
    if (isFlag || isAlias) {
      if (expectingValue) {
        expectingValue();
      }
      const parsedFlag = parseFlag(argvElement);
      const { flagValue } = parsedFlag;
      let { flagName } = parsedFlag;
      if (isAlias) {
        for (let j = 0; j < flagName.length; j += 1) {
          const alias = flagName[j];
          const hasAlias = aliasesMap.get(alias);
          const isLast = j === flagName.length - 1;
          if (hasAlias) {
            setKnown(hasAlias.name, hasAlias.schema, isLast ? flagValue : true);
          } else {
            setUnknown(alias, isLast ? flagValue : true);
          }
        }
        continue;
      }
      let flagSchema = schemas[flagName];
      if (!flagSchema) {
        const camelized = toCamelCase(flagName);
        flagSchema = schemas[camelized];
        if (flagSchema) {
          flagName = camelized;
        }
      }
      if (!flagSchema) {
        setUnknown(flagName, flagValue);
        continue;
      }
      setKnown(flagName, flagSchema, flagValue);
    } else if (expectingValue) {
      expectingValue(argvElement);
    } else {
      parsed._.push(argvElement);
    }
  }
  if (expectingValue) {
    expectingValue();
  }
  validateFlags(schemas, parsed.flags);
  return parsed;
}

module.exports = typeFlag;
