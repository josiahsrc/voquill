import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/login/login_form.dart';
import 'package:flutter/material.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: true),
      body: SingleChildScrollView(
        padding: Theming.padding,
        child: const LoginForm(
          defaultMode: LoginMode.signIn,
        ),
      ),
    );
  }
}
