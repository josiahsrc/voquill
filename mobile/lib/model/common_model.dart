enum ActionStatus {
  idle,
  loading,
  success,
  error;

  bool get isIdle => this == ActionStatus.idle;
  bool get isLoading => this == ActionStatus.loading;
  bool get isSuccess => this == ActionStatus.success;
  bool get isError => this == ActionStatus.error;
}
