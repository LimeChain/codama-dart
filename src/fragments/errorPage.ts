import { ProgramNode } from '@codama/nodes';

import { createFragment, Fragment, RenderScope } from '../utils';

export function getErrorPageFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        programNode: ProgramNode;
    },
): Fragment {
    const { programNode, nameApi } = scope;
    const className = nameApi.programErrorClass(programNode.name);
    const errors = [...programNode.errors].sort((a, b) => a.code - b.code);

    const errorConstants = errors
        .map(error => {
            const constantName = nameApi.errorConstant(error.name);
            const docs = error.docs && error.docs.length > 0 ? error.docs.join(' ') : '';
            const docComment = docs ? `  /// ${docs}\n` : '';
            return `${docComment}  static const int ${constantName} = ${error.code};`;
        })
        .join('\n');

    const errorMessages = errors
        .map(error => {
            const constantName = nameApi.errorConstant(error.name);
            const escapedMessage = error.message.replace(/'/g, "\\'");
            return `    ${constantName}: '${escapedMessage}',`;
        })
        .join('\n');

    const content = `/// Program errors for ${programNode.name}
class ${className} {
${errorConstants}

  static const Map<int, String> _errorMessages = {
${errorMessages}
  };

  /// Get error message for a given error code
  static String getMessage(int code) {
    return _errorMessages[code] ?? 'Unknown error code: $code';
  }

  /// Check if the given code is a valid error code for this program
  static bool isValidErrorCode(int code) {
    return _errorMessages.containsKey(code);
  }

  /// Get all error codes
  static List<int> getAllErrorCodes() {
    return _errorMessages.keys.toList();
  }
}`;

    return createFragment(content, []);
}
