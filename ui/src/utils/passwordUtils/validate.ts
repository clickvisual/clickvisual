export const loginNotes = [
  { type: 'length', msg: '密码长度必须为 8～20 位' },
  { type: 'strReg', msg: ' 密码不能含有 4 位连续的字母' },
  { type: 'numReg', msg: '密码不能含有 4 位连续的数字' },
  { type: 'keyboardHorizontalReg', msg: '密码不能含有 4 位键盘横向方向连续的字母' },
  { type: 'isStrInSlope', msg: '密码不能含有 4 位键盘斜向方向连续的字符' },
  { type: 'sameReg', msg: '密码不能含有连续 4 位相同的数字或字母' },
  { type: 'regex', msg: '密码中必须包含字母、数字、特殊字符中两种及以上' },
];

const ValidatePassword = (password: string) => {
  const regex = /(?=.*[0-9])(?=.*[a-zA-Z]).{8,20}/;
  // 字母连续规则
  const strReg =
    /(a(?=b)|b(?=c)|c(?=d)|d(?=e)|e(?=f)|f(?=g)|g(?=h)|h(?=i)|i(?=j)|j(?=k)|k(?=l)|l(?=m)|m(?=n)|n(?=o)|o(?=p)|p(?=q)|q(?=r)|r(?=s)|s(?=t)|t(?=u)|u(?=v)|v(?=w)|w(?=x)|x(?=y)|y(?=z)|z(?=a)){3}[a-z]/i;
  // 数字连续规则
  const numReg = /(0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)|9(?=0)){3}\d/;
  // 键盘字母横向连续规则
  const keyboardHorizontalReg =
    /(q(?=w)|w(?=e)|e(?=r)|r(?=t)|t(?=y)|y(?=u)|u(?=i)|i(?=o)|o(?=p)|p(?=q) |a(?=s)|s(?=d)|d(?=f)|f(?=g)|g(?=h)|h(?=j)|j(?=k)|k(?=l)|l(?=a) | z(?=x)|x(?=c)|c(?=v)|v(?=b)|b(?=n)|n(?=m)|m(?=z)){3}[a-z]/i;
  // 多个相同字母、数字规则
  const sameReg = /(\w)\1{3}/i;

  /**
   * 键盘斜线的4个字符是否在password里面
   */
  const isStrInSlope = (password: string) => {
    let keyboardSlopeArr = [
      '1qaz',
      '2wsx',
      '3edc',
      '4rfv',
      '5tgb',
      '6yhn',
      '7ujm',
      '8ik,',
      '9ol.',
      '0p;/',
      '=[;.',
      '-pl,',
      '0okm',
      '9ijn',
      '8uhb',
      '7ygv',
      '6tfc',
      '5rdx',
      '4esz',
    ];
    return keyboardSlopeArr.some((val: string) => password.toLowerCase().indexOf(val) > -1);
  };

  if (regex.test(password)) {
    if (sameReg.test(password)) {
      return loginNotes.find((item) => item.type === 'sameReg')?.msg;
    } else if (strReg.test(password)) {
      return loginNotes.find((item) => item.type === 'strReg')?.msg;
    } else if (numReg.test(password)) {
      return loginNotes.find((item) => item.type === 'numReg')?.msg;
    } else if (keyboardHorizontalReg.test(password)) {
      return loginNotes.find((item) => item.type === 'keyboardHorizontalReg')?.msg;
    } else if (isStrInSlope(password)) {
      return loginNotes.find((item) => item.type === 'isStrInSlope')?.msg;
    }
    return false;
  }
  return '密码复杂度太低';
};

export default ValidatePassword;
