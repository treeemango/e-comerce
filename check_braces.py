
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    
    for r, line in enumerate(lines):
        for c, char in enumerate(line):
            if char in '{(':
                stack.append((char, r + 1, c + 1))
            elif char in '})':
                if not stack:
                    print(f"Unexpected {char} at {r+1}:{c+1}")
                    continue
                last_char, lr, lc = stack.pop()
                if (char == '}' and last_char != '{') or (char == ')' and last_char != '('):
                    print(f"Mismatched {char} at {r+1}:{c+1}, matches {last_char} from {lr}:{lc}")
    
    for char, r, c in stack:
        print(f"Unclosed {char} from {r}:{c}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
