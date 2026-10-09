import io, re
p = 'apps-script/Code.gs'
s = io.open(p, encoding='utf-8').read()
# Apps Script V8 hoac khong chap nhan ten ham co dau, doi sang ASCII
s = s.replace('soSanhBấtBiến_', 'soSanhKhacNhau_')
# go hai ham trung lap chi mot ham layThuMucDrive_
s = s.replace("""function taoThuMucDrive_(ten) {
  const ds = DriveApp.getFoldersByName(ten);
  return ds.hasNext() ? ds.next() : DriveApp.createFolder(ten);
}

function layThuMucDrive_(ten) {
  const ds = DriveApp.getFoldersByName(ten);
  return ds.hasNext() ? ds.next() : DriveApp.createFolder(ten);
}""", """/** Lay thu muc Drive theo ten, tao moi neu chua co. */
function layThuMucDrive_(ten) {
  const ds = DriveApp.getFoldersByName(ten);
  return ds.hasNext() ? ds.next() : DriveApp.createFolder(ten);
}""")
s = s.replace('  taoThuMucDrive_(TEN_THU_MUC.font);\n  taoThuMucDrive_(TEN_THU_MUC.anh);',
              '  layThuMucDrive_(TEN_THU_MUC.font);\n  layThuMucDrive_(TEN_THU_MUC.anh);')
# them cot Ngay cap nhat vao HEADER_NOI_DUNG de khop voi code ghi them cot 3
s = s.replace("const HEADER_NOI_DUNG = ['Khoá', 'Nội dung'];",
              "const HEADER_NOI_DUNG = ['Khoá', 'Nội dung', 'Ngày cập nhật'];")
s = s.replace("if (sheetNoiDung.getLastRow() === 0) sheetNoiDung.getRange(1, 1, 1, 2).setValues([HEADER_NOI_DUNG]);",
              "if (sheetNoiDung.getLastRow() === 0) sheetNoiDung.getRange(1, 1, 1, 3).setValues([HEADER_NOI_DUNG]);")
io.open(p, 'w', encoding='utf-8').write(s)
print('da xong')
print('con ten ham co dau:', len(re.findall(r'function\s+\w*[àáâãèéêìíòóôõùúýÿăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]+\w*', s)))
