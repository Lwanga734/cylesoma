String roleLabel(String? role) {
  switch (role) {
    case null:
      return 'Unknown';
    case 'hod':
      return 'Head of department';
    case 'hr':
      return 'HR officer';
    default:
      return role[0].toUpperCase() + role.substring(1);
  }
}

String formatDate(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
