import { FormattedMessage } from 'react-intl'
import AppLogo from '../../assets/app-logo.svg?react'
import { getAppName } from '../../utils/env.utils'
import { useAppStore } from '../../store'
import { produceAppState } from '../../store'
import { setLoginMode, submitSignIn, submitSignUp } from '../../actions/login.actions'
import {
  Alert,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  CircularProgress,
} from '@mui/material'

export default function LoginPage() {
  const { name, email, password, confirmPassword, mode, status, errorMessage } =
    useAppStore((state) => state.login)

  const isCreateAccount = mode === 'signUp'
  const isLoading = status === 'loading'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreateAccount) {
      submitSignUp()
    } else {
      submitSignIn()
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'level1',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, bgcolor: 'level0' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <AppLogo width={48} height={48} style={{ color: 'primary', marginBottom: 12 }} />
            <Typography variant="h5" fontWeight={600}>
              {getAppName()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isCreateAccount ? <FormattedMessage defaultMessage="Create your account" /> : <FormattedMessage defaultMessage="Sign in to your account" />}
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {isCreateAccount && (
              <TextField
                label="Full Name"
                fullWidth
                size="small"
                value={name}
                disabled={isLoading}
                onChange={(e) =>
                  produceAppState((draft) => {
                    draft.login.name = e.target.value
                  })
                }
              />
            )}
            <TextField
              label="Email"
              type="email"
              fullWidth
              size="small"
              value={email}
              disabled={isLoading}
              onChange={(e) =>
                produceAppState((draft) => {
                  draft.login.email = e.target.value
                })
              }
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              size="small"
              value={password}
              disabled={isLoading}
              onChange={(e) =>
                produceAppState((draft) => {
                  draft.login.password = e.target.value
                })
              }
            />
            {isCreateAccount && (
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                size="small"
                value={confirmPassword}
                disabled={isLoading}
                onChange={(e) =>
                  produceAppState((draft) => {
                    draft.login.confirmPassword = e.target.value
                  })
                }
              />
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ mt: 1 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : isCreateAccount ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" textAlign="center">
            {isCreateAccount ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              component="button"
              variant="body2"
              disabled={isLoading}
              sx={{ verticalAlign: "baseline" }}
              onClick={() => setLoginMode(isCreateAccount ? 'signIn' : 'signUp')}
            >
              {isCreateAccount ? 'Sign in' : 'Create one'}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
